import React, { Component } from 'react'
import { Text, StyleSheet, View, ScrollView, TextInput, TouchableOpacity, TouchableWithoutFeedback, Modal, Dimensions, ActivityIndicator, AsyncStorage, ToastAndroid, Alert, Platform } from 'react-native'
import { Colors } from '../Components/Asset';
import MyActionSheet from '../Components/MyActionSheet';
import gql from 'graphql-tag'
import { Query, Mutation } from 'react-apollo'
import { StackActions, NavigationActions } from 'react-navigation';


const resetAction = StackActions.reset({
    index: 0,
    actions: [NavigationActions.navigate({ routeName: 'Bottom' })],
});


const createProfile = gql`
mutation createProfile($input: CreateProfileInput!) {
        createProfile(input: $input) {
            userid
            name
            password
            grade
            class_
            number
        }
    }
`

const checkId = gql`
query checkProfileUserid($userid: String) {
        checkProfileUserid(userid: $userid)
    }
`
const checkNickName = gql`
query checkProfileName($name: String) {
    checkProfileName(name: $name)
}
`

const gradeList = ['1', '2', '3'];
let classList = [];
for (let i = 1; i <= 11; i++) classList.push(i.toString());
let numberList = [];
for (let i = 1; i <= 40; i++) numberList.push(i.toString());
const myWidth = Dimensions.get('window').width - 100;


export default class SignUpFacebookScreen extends Component {
    static navigationOptions = { title: '추가정보' }

    constructor(props) {
        super(props);
        this.state = {
            id: this.props.navigation.state.params.userid,
            pw: this.props.navigation.state.params.password,
            pw2: this.props.navigation.state.params.password,
            token: this.props.navigation.state.params.token,
            nickName: '',
            grade: null,
            class: null,
            schoolNumber: null,
            option: gradeList,
            visible: false,
            selected: 0,
        }
    }
    _callBack = (data) => {
        if (this.state.selected === 0) {
            this.setState({ grade: data + 1 })
        } else if (this.state.selected === 1) {
            this.setState({ class: data + 1 })
        } else {
            this.setState({ schoolNumber: data + 1 })
        }
        this._modalClose();
    }
    _showMessage(text) {
        if (Platform.OS === 'android') {
            ToastAndroid.show(text, ToastAndroid.LONG);
        } else {
            Alert.alert(text);
        }
    }
    async _complete(res, res2, res3, g, c, n) {
        await AsyncStorage.setItem('ID', res);
        await AsyncStorage.setItem('NAME', res2);
        await AsyncStorage.setItem('PASSWORD', res3);
        await AsyncStorage.setItem('GRADE', JSON.stringify(g));
        await AsyncStorage.setItem('CLASS', JSON.stringify(c));
        await AsyncStorage.setItem('NUMBER', JSON.stringify(n));
        this.props.navigation.navigate('SignChoice', { grade: g, userid: res });
    }

    render() {
        return (
            <View style={{ flex: 1 }}>
                <ScrollView ref={ref => this.signUpScrollView = ref} style={{ flex: 1 }}>
                    <View style={{ alignItems: 'center', width: '100%', marginTop: 30 }}>


                        <View style={{ width: 300, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
                            <Text style={{ fontSize: 14 }}>닉네임</Text>
                            <TextInput autoCapitalize='none' ref={ref => this.nickNameInput = ref} editable={!this.state.creating} maxLength={8} placeholder='2~8글자' value={this.state.nickName}
                                onChangeText={text => {
                                    if (text[text.length - 1] === ' ') {
                                        this._showMessage("공백은 입력하실 수 없습니다");
                                        return;
                                    }
                                    this.setState({ nickName: text })
                                }
                                }
                                style={{ fontSize: 14, borderBottomColor: '#dbdbdb', borderBottomWidth: 1, width: 200 }} />
                        </View>

                        <TouchableWithoutFeedback onPress={() => {
                            if (this.state.creating) return;
                            this.setState({ visible: true, option: gradeList, selected: 0 })
                        }}>
                            <View style={{ width: 300, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, height: 30 }}>
                                <Text style={{ fontSize: 14 }}>학년</Text>
                                <View style={{ borderBottomColor: '#dbdbdb', borderBottomWidth: 1 }}>
                                    <Text style={{ fontSize: 14, width: 200 }}>
                                        {this.state.grade}
                                    </Text>
                                </View>

                            </View>
                        </TouchableWithoutFeedback>
                        <TouchableWithoutFeedback onPress={() => {
                            if (this.state.creating) return;
                            this.setState({ visible: true, option: classList, selected: 1 })
                        }}>
                            <View style={{ width: 300, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, height: 30 }}>
                                <Text style={{ fontSize: 14 }}>반</Text>
                                <View style={{ borderBottomColor: '#dbdbdb', borderBottomWidth: 1 }}>
                                    <Text style={{ fontSize: 14, width: 200 }}>
                                        {this.state.class}
                                    </Text>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                        <TouchableWithoutFeedback onPress={() => {
                            if (this.state.creating) return;
                            this.setState({ visible: true, option: numberList, selected: 2 })
                        }}>
                            <View style={{ width: 300, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, height: 30 }}>
                                <Text style={{ fontSize: 14 }}>번호</Text>
                                <View style={{ borderBottomColor: '#dbdbdb', borderBottomWidth: 1 }}>
                                    <Text style={{ fontSize: 14, width: 200 }}>
                                        {this.state.schoolNumber}
                                    </Text>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                        <Text style={{ fontSize: 10, color: '#bbb' }}>이벤트 당첨시 위의 학번으로 상품이 지급됩니다</Text>
                        <Text style={{ fontSize: 10, color: '#bbb' }}>유저끼리는 학번을 열람할 수 없습니다</Text>
                        <Query variables={{ userid: this.state.id }} query={checkId} fetchPolicy='network-only'>
                            {({ refetch: refetchId }) => (
                                <Query variables={{ name: this.state.nickName }} query={checkNickName} fetchPolicy='network-only'>
                                    {({ refetch: refetchNickName }) => {
                                        return <Mutation mutation={createProfile}>
                                            {(createProfile) => (
                                                <TouchableOpacity onPress={() => {
                                                    if (this.state.creating) return;

                                                    if (this.state.nickName === '') {
                                                        this._showMessage("닉네임을 입력해주세요");
                                                        this.nickNameInput.focus();
                                                        return;
                                                    } if (this.state.grade === null) {
                                                        this._showMessage("학년을 선택해주세요");
                                                        this.setState({ visible: true, option: gradeList, selected: 0 });
                                                        return;
                                                    } if (this.state.class === null) {
                                                        this._showMessage("반을 선택해주세요");
                                                        this.setState({ visible: true, option: classList, selected: 1 });
                                                        return;
                                                    } if (this.state.schoolNumber === null) {
                                                        this._showMessage("번호을 선택해주세요");
                                                        this.setState({ visible: true, option: numberList, selected: 2 });
                                                        return;
                                                    }

                                                    if (this.state.nickName.length < 2 || this.state.nickName > 8) {
                                                        this._showMessage("닉네임을 2~8글자 이내로 해주세요");
                                                        this.nickNameInput.focus();
                                                        return;
                                                    }
                                                    this.setState({ creating: true });
                                                    refetchId().then(res => {
                                                        if (res.data.checkProfileUserid) {
                                                            refetchNickName().then(res2 => {
                                                                if (res2.data.checkProfileName) {
                                                                    const input = {
                                                                        userid: this.state.id,
                                                                        name: this.state.nickName,
                                                                        password: this.state.pw,
                                                                        grade: this.state.grade,
                                                                        class_: this.state.class,
                                                                        number: this.state.schoolNumber,
                                                                        notificationToken: this.state.token,
                                                                    }
                                                                    createProfile({ variables: { input: input } }).then(res3 => {
                                                                        this._complete(res3.data.createProfile.userid, res3.data.createProfile.name, res3.data.createProfile.password, res3.data.createProfile.grade, res3.data.createProfile.class_, res3.data.createProfile.number);
                                                                    })
                                                                } else {
                                                                    this._showMessage("닉네임 중복");
                                                                    this.nickNameInput.focus();
                                                                    this.setState({ creating: false });
                                                                    return;
                                                                }
                                                            })
                                                        } else {
                                                            this._showMessage("아이디 중복");
                                                            // this.idInput.focus();
                                                            this.setState({ creating: false });
                                                            return;
                                                        }
                                                    })



                                                }} style={{ marginTop: 40 }} activeOpacity={0.4}>
                                                    <View style={{ width: 100, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                                                        {this.state.creating
                                                            ?
                                                            <ActivityIndicator size='small' color={Colors.highlightBlue} />
                                                            :
                                                            <Text style={{ fontSize: 14, color: Colors.highlightBlue }}>회원가입</Text>}
                                                    </View>
                                                </TouchableOpacity>
                                            )}
                                        </Mutation>
                                    }}
                                </Query>
                            )}
                        </Query>
                        <View style={{ height: this.state.btnLocation }} />
                    </View>

                </ScrollView>
                {this.numberModal(this.state.option, this.state.visible, this._callBack)}
            </View>

        )

    }
    _modalClose = () => {
        this.setState({ visible: false });
    }
    numberModal(data, visible, callBack) {
        return (
            <Modal
                animationType='fade'
                transparent={true}
                visible={visible}
                onRequestClose={this._modalClose}
            >
                <TouchableWithoutFeedback style={{ flex: 1 }} onPress={this._modalClose}>
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#80808080' }}>
                        <View style={{ width: myWidth, backgroundColor: 'white', borderRadius: 10, overflow: 'hidden', alignItems: 'center' }}>
                            <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
                                {data.map((info, index) =>
                                    <View key={index}>
                                        <TouchableWithoutFeedback onPress={() => callBack(index)}>
                                            <View style={{ borderBottomColor: '#dbdbdb', borderBottomWidth: 0.5, height: 50, width: myWidth, alignItems: 'center', justifyContent: 'center' }}>
                                                <Text style={{ fontSize: 16 }}>{info}</Text>
                                            </View>
                                        </TouchableWithoutFeedback>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    </View>
                </TouchableWithoutFeedback>

            </Modal>
        )
    }
}

const styles = StyleSheet.create({})
